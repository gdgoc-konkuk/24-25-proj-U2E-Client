interface RecentNews {
  newsId: number;
  regionList: string[];
  climateList: string[];
  newsTitle: string;
}

interface AIRelated {
  title: string;
  url: string;
}

interface News {
  climateList: string[];
  regionList: string[];
  newsTitle: string;
  newsUrl: string;
  newsImageUrl: string;
  newsBody: string;
  newsDate: string;
  aiSolution: string;
  aiRelated: AIRelated[];
}
